const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  log(userId, action, entityType, entityId, metadata = {}) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, action, entityType || null, entityId || null, JSON.stringify(metadata), now);
    return id;
  },

  findByEntity(entityType, entityId) {
    return db.prepare(`
      SELECT al.*, u.name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = ? AND al.entity_id = ?
      ORDER BY al.created_at DESC
    `).all(entityType, entityId);
  },

  findRecent(limit = 20) {
    return db.prepare(`
      SELECT al.*, u.name AS user_name, u.email AS user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT ?
    `).all(limit);
  }
};
