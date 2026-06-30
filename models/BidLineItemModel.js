const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  bulkCreate(bidId, items) {
    const stmt = db.prepare(`
      INSERT INTO bid_line_items (id, bid_id, rfp_line_item_id, unit_price, quantity, total_price, green_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(generateUUID(), bidId, item.rfp_line_item_id, item.unit_price, item.quantity, item.unit_price * item.quantity, item.green_score || null, item.notes || null);
      }
    });
    insertMany(items);
    return this.findByBid(bidId);
  },

  findByBid(bidId) {
    return db.prepare(`
      SELECT bli.*, li.item_name, li.unit AS rfp_unit
      FROM bid_line_items bli
      JOIN rfp_line_items li ON bli.rfp_line_item_id = li.id
      WHERE bli.bid_id = ?
      ORDER BY li.sort_order
    `).all(bidId);
  }
};
