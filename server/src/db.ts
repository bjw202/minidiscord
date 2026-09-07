// SQLite 연결과 스키마 (spec 5장 데이터 모델)
import Database from 'better-sqlite3'

export type Db = Database.Database

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
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
  verifier_pub TEXT UNIQUE NOT NULL,   -- 조회 열쇠이자 검증자 — Ed25519 공개키 64자 hex (SPEC-GWAUTH-002 §D-1·D-3)
  server_confirm_key TEXT NOT NULL,    -- 서버가 자신을 증명하는 대칭 비밀 — 게이트웨이 사칭 방향은 별도 방어의 몫이다
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
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_targets_bot ON message_targets(bot_id, message_id);
`

// @MX:ANCHOR: [AUTO] SQLite 통합 지점이자 스키마·마이그레이션의 단일 출처 — buildServer 와 서버 시험 열한 파일이 이 함수로 DB 를 만든다
// @MX:REASON: DDL(테이블 8·인덱스 2)과 명령형 마이그레이션(v1 bot_tokens 스키마 거부)이 여기에만 있다. 테이블을 더하거나 열을 바꾸면 이 함수와 codemaps/data-flow.md 가 함께 바뀐다
export function openDb(path: string): Db {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)

  // SPEC-GWAUTH-002 §D-3 — v1 token_hash 에서 v2 검증자로 가는 변환은 존재하지 않는다(서버는 평문 토큰을 저장한
  // 적이 없어 유도할 수 없다). 마이그레이션 문은 쓰지 않기로 판정했다 — 변환 불가인 마이그레이션은 행을 지우는
  // 일의 다른 이름이다. 대신 옛 모양 테이블은 여기서 큰 소리로 거절한다 — 위 DDL 은 기존 파일의 컬럼을 못 고치므로,
  // 검사가 없으면 «테이블은 있는데 컬럼이 없는» 상태가 첫 발급의 no such column 까지 조용히 숨는다.
  // @MX:NOTE: [AUTO] 이 검사는 openDb 마다 PRAGMA 를 한 번 읽는다 — 개발 단계 판정이며, 배치 이전 경로가 필요해지는 것은 후속 카드 t23 이후의 별도 결정이다
  const tokenCols = db.prepare('PRAGMA table_info(bot_tokens)').all() as { name: string }[]
  if (!tokenCols.some(c => c.name === 'verifier_pub')) {
    throw new Error('bot_tokens 이 v1 스키마다 — v2 로의 이전 경로는 없다. 개발용 DB 파일을 지우고 새로 만들 것 (SPEC-GWAUTH-002 §D-3)')
  }
  // v2 C1 — 비밀번호 열이 남은 옛 users 표는 이름 로그인의 INSERT 가 NOT NULL 로 막힌다. 같은 이유로 여기서 거절한다.
  // 위 DDL 의 users 는 열 셋(id·username·created_at)이다 — 열 수가 다르면 옛 파일이다
  const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (userCols.length !== 3) {
    throw new Error('users 가 옛 스키마(비밀번호 열)다 — v2 는 비밀번호가 없다. 개발용 DB 파일을 지우고 새로 만들 것')
  }

  return db
}
