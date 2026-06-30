const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ rfp_id, vendor_id, total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO bids (id, rfp_id, vendor_id, status, total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes, submitted_at, updated_at)
      VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, rfp_id, vendor_id, total_amount, currency || 'USD', delivery_timeline_days || null, sustainability_notes || null, carbon_offset_included ? 1 : 0, notes || null, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, v.sustainability_score,
        r.title AS rfp_title, r.buyer_id, r.status AS rfp_status
      FROM bids b
      JOIN vendors v ON b.vendor_id = v.id
      JOIN rfps r ON b.rfp_id = r.id
      WHERE b.id = ?
    `).get(id);
  },

  findByRFP(rfpId) {
    return db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, v.sustainability_score,
        (SELECT COUNT(*) FROM bid_line_items bli WHERE bli.bid_id = b.id) AS line_item_count
      FROM bids b
      JOIN vendors v ON b.vendor_id = v.id
      WHERE b.rfp_id = ?
      ORDER BY b.total_amount ASC
    `).all(rfpId);
  },

  findByVendor(vendorId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const total = db.prepare('SELECT COUNT(*) as count FROM bids WHERE vendor_id = ?').get(vendorId).count;
    const data = db.prepare(`
      SELECT b.*, r.title AS rfp_title, r.status AS rfp_status
      FROM bids b JOIN rfps r ON b.rfp_id = r.id
      WHERE b.vendor_id = ?
      ORDER BY b.submitted_at DESC LIMIT ? OFFSET ?
    `).all(vendorId, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  findByBuyer(buyerId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM bids b JOIN rfps r ON b.rfp_id = r.id WHERE r.buyer_id = ?
    `).get(buyerId).count;
    const data = db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, r.title AS rfp_title
      FROM bids b
      JOIN rfps r ON b.rfp_id = r.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE r.buyer_id = ?
      ORDER BY b.submitted_at DESC LIMIT ? OFFSET ?
    `).all(buyerId, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, fields) {
    const allowed = ['status', 'total_amount', 'currency', 'delivery_timeline_days', 'sustainability_notes', 'carbon_offset_included', 'notes', 'is_winner'];
    const updates = []; const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'carbon_offset_included' || key === 'is_winner') { updates.push(`${key} = ?`); values.push(fields[key] ? 1 : 0); }
        else { updates.push(`${key} = ?`); values.push(fields[key]); }
      }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id);
    db.prepare(`UPDATE bids SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
};
