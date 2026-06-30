const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ user_id, company_name, description, website, address, country, tax_id, green_certifications }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    const certs = green_certifications ? JSON.stringify(green_certifications) : '[]';
    const stmt = db.prepare(`
      INSERT INTO vendors (id, user_id, company_name, description, website, address, country, tax_id, green_certifications, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, user_id, company_name, description || null, website || null, address || null, country || null, tax_id || null, certs, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  },

  findByUserId(userId) {
    return db.prepare('SELECT * FROM vendors WHERE user_id = ?').get(userId);
  },

  update(id, fields) {
    const allowed = ['company_name', 'description', 'website', 'address', 'country', 'tax_id', 'green_certifications', 'sustainability_score', 'is_approved'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'green_certifications') {
          updates.push(`${key} = ?`);
          values.push(JSON.stringify(fields[key]));
        } else {
          updates.push(`${key} = ?`);
          values.push(fields[key]);
        }
      }
    }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  findAll({ page = 1, limit = 20, is_approved, country } = {}) {
    const conditions = [];
    const values = [];

    if (is_approved !== undefined) {
      conditions.push('v.is_approved = ?');
      values.push(is_approved ? 1 : 0);
    }
    if (country) {
      conditions.push('v.country = ?');
      values.push(country);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM vendors v ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT v.*, u.name AS user_name, u.email
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      ${where}
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
};
