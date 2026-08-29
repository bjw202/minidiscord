// SQLite 연결과 스키마 (spec 5장 데이터 모델)
import Database from 'better-sqlite3'

export type Db = Database.Database

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bot_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  token_hash TEXT UNIQUE NOT NULL,
  last_delivered_id INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('user','bot','system')),
  author_user_id INTEGER REFERENCES users(id),
  author_bot_id INTEGER REFERENCES bots(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS message_targets (
  message_id INTEGER NOT NULL REFERENCES messages(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  delivery TEXT NOT NULL CHECK (delivery IN ('to','cc'))
);
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS room_members (
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_targets_bot ON message_targets(bot_id, message_id);
`

// 방 멤버십 이행 이름 (SPEC-ROOMAUTHZ-001) — 이 이름이 기록돼 있으면 백필을 다시 돌지 않는다
const ROOMAUTHZ_BACKFILL_MARKER = 'roomauthz-001-backfill'

export function openDb(path: string): Db {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)

  // REQ-ROOMAUTHZ-002 — CREATE TABLE IF NOT EXISTS 는 기존 표에 컬럼을 더하지 않는다.
  // 상수만 고치면 새 DB 에서만 동작하고 돌고 있던 DB 는 조용히 옛 모양으로 남으므로,
  // PRAGMA 로 확인해 없을 때만 더한다. NULL 허용 — 기존 행에 지어낸 기록을 넣지 않는다.
  const roomCols = db.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]
  if (!roomCols.some(c => c.name === 'created_by')) {
    db.exec('ALTER TABLE rooms ADD COLUMN created_by INTEGER REFERENCES users(id)')
  }

  // @MX:NOTE: 백필 1회성은 표식 확인 + 단일 트랜잭션의 조합으로만 성립한다. INSERT OR IGNORE 만 남기면 재기동마다 백필이 돌아, 탈퇴 기능이 생긴 뒤 나간 사람이 되살아난다
  // @MX:SPEC: SPEC-ROOMAUTHZ-001
  // REQ-ROOMAUTHZ-003 — 표식이 없을 때만 백필. 백필과 표식 기록은 하나의 트랜잭션 —
  // 갈라지면 "백필했는데 표식 없음"(재실행) 또는 "표식만 있음"(거짓 완료)이 생긴다.
  const marked = db
    .prepare('SELECT COUNT(*) c FROM schema_migrations WHERE name = ?')
    .get(ROOMAUTHZ_BACKFILL_MARKER) as { c: number }
  if (marked.c === 0) {
    const backfill = db.transaction(() => {
      // 그 시점의 모든 방 × 모든 사용자 (운영자 결정 D3)
      db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) SELECT r.id, u.id FROM rooms r, users u').run()
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(ROOMAUTHZ_BACKFILL_MARKER)
    })
    backfill()
  }

  return db
}
