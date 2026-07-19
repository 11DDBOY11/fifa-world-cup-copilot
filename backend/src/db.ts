import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { venues } from './config/venues';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'fan-copilot.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Recreate crowd_status table to update schema from v1 to v2 if needed
const tableInfo = db.prepare("PRAGMA table_info(crowd_status)").all() as { name: string }[];
const hasVenueId = tableInfo.some((col) => col.name === 'venue_id');

if (tableInfo.length > 0 && !hasVenueId) {
  console.log('Dropping old v1 crowd_status table...');
  db.exec('DROP TABLE crowd_status');
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS crowd_status (
    venue_id   TEXT NOT NULL,
    gate_id    TEXT NOT NULL,
    occupancy  INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (venue_id, gate_id)
  );

  CREATE TABLE IF NOT EXISTS chat_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Seed initial gate rows for all venues if not present
const insertGate = db.prepare(`
  INSERT OR IGNORE INTO crowd_status (venue_id, gate_id, occupancy, updated_at)
  VALUES (?, ?, ?, ?)
`);

const now = new Date().toISOString();
for (const venue of venues) {
  for (const gate of venue.gates) {
    insertGate.run(venue.id, gate, 50, now);
  }
}

export default db;
