const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  bulkCreate(rfpId, items) {
    const stmt = db.prepare(`
      INSERT INTO rfp_line_items (id, rfp_id, product_id, item_name, description, quantity, unit, estimated_price, green_requirement, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const insertMany = db.transaction((items) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        stmt.run(generateUUID(), rfpId, item.product_id || null, item.item_name, item.description || null, item.quantity, item.unit, item.estimated_price || null, item.green_requirement || null, i + 1, now);
      }
    });
    insertMany(items);
    return this.findByRFP(rfpId);
  },

  findByRFP(rfpId) {
    return db.prepare(`
      SELECT li.*, p.name AS product_name
      FROM rfp_line_items li
      LEFT JOIN products p ON li.product_id = p.id
      WHERE li.rfp_id = ?
      ORDER BY li.sort_order
    `).all(rfpId);
  },

  deleteByRFP(rfpId) {
    db.prepare('DELETE FROM rfp_line_items WHERE rfp_id = ?').run(rfpId);
  }
};
