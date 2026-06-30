const path = require('path');
const fs = require('fs');

// Set test environment BEFORE any other module loads
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET='test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const testDbPath = path.join(__dirname, '..', 'data', 'test.db');

// Delete existing test db for a fresh start
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (e) { /* ignore */ }
}

// Clear db module from cache so it reopens the fresh db file
delete require.cache[require.resolve('../config/db')];

// Run migration (creates new db connection via the fresh require)
require('../migrations/001_initial_schema').run();
