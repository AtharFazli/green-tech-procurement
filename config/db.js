const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.NODE_ENV === 'test'
  ? path.join(__dirname, '..', 'data', 'test.db')
  : path.join(__dirname, '..', 'data', 'green_tech_procurement.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
