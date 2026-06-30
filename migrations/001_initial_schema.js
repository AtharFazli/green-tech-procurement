const crypto = require('crypto');
const db = require('../config/db');

function generateUUID() {
  return crypto.randomUUID();
}

function run() {
  console.log('Running migration: 001_initial_schema');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer','vendor','admin')),
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      description TEXT,
      website TEXT,
      address TEXT,
      country TEXT,
      tax_id TEXT,
      green_certifications TEXT,
      sustainability_score REAL DEFAULT 0,
      is_approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      parent_id TEXT REFERENCES product_categories(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES product_categories(id),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      base_price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      carbon_footprint_kg REAL,
      is_green_certified INTEGER DEFAULT 0,
      stock_qty INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','discontinued')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rfps (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','open','under_review','awarded','cancelled')),
      deadline TEXT NOT NULL,
      budget_min REAL,
      budget_max REAL,
      currency TEXT DEFAULT 'USD',
      sustainability_requirements TEXT,
      is_green_rfp INTEGER DEFAULT 0,
      awarded_bid_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rfp_line_items (
      id TEXT PRIMARY KEY,
      rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      item_name TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      estimated_price REAL,
      green_requirement TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
      vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','accepted','rejected','withdrawn')),
      total_amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      delivery_timeline_days INTEGER,
      sustainability_notes TEXT,
      carbon_offset_included INTEGER DEFAULT 0,
      notes TEXT,
      is_winner INTEGER DEFAULT 0,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bid_line_items (
      id TEXT PRIMARY KEY,
      bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
      rfp_line_item_id TEXT NOT NULL REFERENCES rfp_line_items(id) ON DELETE CASCADE,
      unit_price REAL NOT NULL,
      quantity REAL NOT NULL,
      total_price REAL NOT NULL,
      green_score REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_green ON products(is_green_certified);
    CREATE INDEX IF NOT EXISTS idx_rfps_buyer ON rfps(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_rfps_status ON rfps(status);
    CREATE INDEX IF NOT EXISTS idx_rfps_deadline ON rfps(deadline);
    CREATE INDEX IF NOT EXISTS idx_rfp_line_items_rfp ON rfp_line_items(rfp_id);
    CREATE INDEX IF NOT EXISTS idx_bids_rfp ON bids(rfp_id);
    CREATE INDEX IF NOT EXISTS idx_bids_vendor ON bids(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_bids_rfp_vendor_unique ON bids(rfp_id, vendor_id);
    CREATE INDEX IF NOT EXISTS idx_bid_line_items_bid ON bid_line_items(bid_id);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
  `);

  console.log('Migration 001_initial_schema completed');
}

module.exports = { run, generateUUID };
