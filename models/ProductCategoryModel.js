const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ name, slug, description, parent_id }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO product_categories (id, name, slug, description, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, slug, description || null, parent_id || null, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id);
  },

  findBySlug(slug) {
    return db.prepare('SELECT * FROM product_categories WHERE slug = ?').get(slug);
  },

  findAll() {
    return db.prepare('SELECT * FROM product_categories ORDER BY name').all();
  },

  getTree() {
    return db.prepare(`
      SELECT c.*, p.name AS parent_name
      FROM product_categories c
      LEFT JOIN product_categories p ON c.parent_id = p.id
      ORDER BY c.name
    `).all();
  },

  update(id, fields) {
    const allowed = ['name', 'slug', 'description', 'parent_id'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return this.findById(id);
    values.push(id);
    db.prepare(`UPDATE product_categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    db.prepare('UPDATE product_categories SET parent_id = NULL WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
  }
};
