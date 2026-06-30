const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

const UserModel = {
  create({ email, password_hash, name, role }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, email, password_hash, name, role, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  update(id, fields) {
    const allowedFields = ['name', 'avatar_url', 'is_active', 'last_login_at', 'updated_at'];
    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    // Always update updated_at
    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },

  findAll({ page = 1, limit = 20, role } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [];

    if (role) {
      whereClause = 'WHERE role = ?';
      params.push(role);
    }

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params);
    const total = countResult.count;

    const rows = db.prepare(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { rows, total };
  }
};

module.exports = UserModel;
