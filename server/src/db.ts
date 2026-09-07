// SQLite 연결과 스키마 (spec 5장 데이터 모델 — v2 A 단계 SPEC-BOTMODEL-001 §3.1)
import Database from 'better-sqlite3'

export type Db = Database.Database

// 봇은 신원이다 — 토큰 하나가 bots 행에 산다. 참여는 방 × 봇(room_bots)이고, 재접속 재전송의
// 커서(last_delivered_id)는 참여 행에 산다. v1 의 방별 토큰 표(방·봇 쌍마다 토큰과 커서)는 없다.
// role 열은 B 단계가 읽는다 — 표를 두 번 바꾸지 않으려고 여기서 만들되 A 단계는 저장만 한다 (결정 ③).
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
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS room_bots (
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  last_delivered_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, bot_id)
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

// @MX:ANCHOR: [AUTO] SQLite 통합 지점이자 스키마의 단일 출처 — buildServer 와 서버 시험 열한 파일이 이 함수로 DB 를 만든다
// @MX:REASON: DDL(테이블 8·인덱스 2)과 옛 파일 거절 검사가 여기에만 있다. 테이블을 더하거나 열을 바꾸면 이 함수와 codemaps/data-flow.md 가 함께 바뀐다
export function openDb(path: string): Db {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)

  // 옛 파일 거절 — 위 DDL 은 기존 파일의 열을 못 고치므로, 검사가 없으면 «테이블은 있는데 열이 없는»
  // 상태가 첫 등록의 no such column 까지 조용히 숨는다. v1(방별 토큰 시대)의 bots 에는 token 열이 없다 —
  // 그 한 줄로 v2 표 모양을 판정한다. 이전 경로는 없다: 봇을 다시 등록하면 된다 (REQ-BOTMODEL-003)
  const botCols = db.prepare('PRAGMA table_info(bots)').all() as { name: string }[]
  if (!botCols.some(c => c.name === 'token')) {
    throw new Error('bots 가 옛 스키마(방별 토큰 시대)다 — v2 는 봇마다 토큰 하나다. 개발용 DB 파일을 지우고 새로 만드세요 (SPEC-BOTMODEL-001 §3.1)')
  }
  // v2 C1 — 비밀번호 열이 남은 옛 users 표는 이름 로그인의 INSERT 가 NOT NULL 로 막힌다. 같은 이유로 여기서 거절한다.
  // 위 DDL 의 users 는 열 셋(id·username·created_at)이다 — 열 수가 다르면 옛 파일이다
  const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (userCols.length !== 3) {
    throw new Error('users 가 옛 스키마(비밀번호 열)다 — v2 는 비밀번호가 없다. 개발용 DB 파일을 지우고 새로 만드세요')
  }

  return db
}
