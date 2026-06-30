const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ buyer_id, title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO rfps (id, buyer_id, title, description, status, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, buyer_id, title, description || null, deadline, budget_min || null, budget_max || null, currency || 'USD', sustainability_requirements || null, is_green_rfp ? 1 : 0, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`
      SELECT r.*, u.name AS buyer_name, u.email AS buyer_email
      FROM rfps r
      JOIN users u ON r.buyer_id = u.id
      WHERE r.id = ?
    `).get(id);
  },

  findByBuyer(buyerId, { page = 1, limit = 20, status } = {}) {
    const conditions = ['r.buyer_id = ?'];
    const values = [buyerId];
    if (status) { conditions.push('r.status = ?'); values.push(status); }
    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM rfps r WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT r.*, u.name AS buyer_name
      FROM rfps r JOIN users u ON r.buyer_id = u.id
      WHERE ${where}
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `).all(...values, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  findAllOpen({ page = 1, limit = 20, is_green_rfp, search } = {}) {
    const conditions = ["r.status = 'open'"];
    const values = [];
    if (is_green_rfp !== undefined) { conditions.push('r.is_green_rfp = ?'); values.push(is_green_rfp ? 1 : 0); }
    if (search) { conditions.push('(r.title LIKE ? OR r.description LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM rfps r WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT r.*, u.name AS buyer_name,
        (SELECT COUNT(*) FROM bids b WHERE b.rfp_id = r.id) AS bid_count
      FROM rfps r JOIN users u ON r.buyer_id = u.id
      WHERE ${where}
      ORDER BY r.deadline ASC LIMIT ? OFFSET ?
    `).all(...values, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, fields) {
    const allowed = ['title', 'description', 'status', 'deadline', 'budget_min', 'budget_max', 'currency', 'sustainability_requirements', 'is_green_rfp', 'awarded_bid_id'];
    const updates = []; const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'is_green_rfp') { updates.push(`${key} = ?`); values.push(fields[key] ? 1 : 0); }
        else { updates.push(`${key} = ?`); values.push(fields[key]); }
      }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id);
    db.prepare(`UPDATE rfps SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
};
