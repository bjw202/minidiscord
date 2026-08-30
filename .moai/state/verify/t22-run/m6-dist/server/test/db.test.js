import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.js';
function testDb() {
    return openDb(join(mkdtempSync(join(tmpdir(), 'md-')), 'test.db'));
}
describe('openDb', () => {
    it('creates all tables', () => {
        const db = testDb();
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .all();
        const names = tables.map(t => t.name);
        for (const t of ['users', 'sessions', 'rooms', 'bots', 'bot_tokens', 'messages', 'message_targets', 'attachments']) {
            expect(names).toContain(t);
        }
    });
    it('is idempotent (reopen same file)', () => {
        const db = testDb();
        db.prepare("INSERT INTO rooms (name) VALUES ('r1')").run();
        const path = db.name;
        db.close();
        const db2 = openDb(path);
        const rows = db2.prepare('SELECT name FROM rooms').all();
        expect(rows).toEqual([{ name: 'r1' }]);
    });
});
