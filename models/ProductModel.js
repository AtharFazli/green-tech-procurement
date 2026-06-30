const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ vendor_id, category_id, name, slug, description, unit, base_price, currency, carbon_footprint_kg, is_green_certified, stock_qty, status }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO products (id, vendor_id, category_id, name, slug, description, unit, base_price, currency, carbon_footprint_kg, is_green_certified, stock_qty, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, vendor_id, category_id || null, name, slug, description || null, unit, base_price, currency || 'USD', carbon_footprint_kg || null, is_green_certified ? 1 : 0, stock_qty || 0, status || 'active', now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`
      SELECT p.*, v.company_name AS vendor_name, c.name AS category_name, c.slug AS category_slug
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
  },

  findBySlug(slug) {
    return db.prepare(`
      SELECT p.*, v.company_name AS vendor_name, c.name AS category_name
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.slug = ?
    `).get(slug);
  },

  findByVendor(vendorId, { page = 1, limit = 20, status } = {}) {
    const conditions = ['p.vendor_id = ?'];
    const values = [vendorId];

    if (status) {
      conditions.push('p.status = ?');
      values.push(status);
    }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM products p WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  findAll({ page = 1, limit = 20, category_id, vendor_id, is_green_certified, status, search, sort_by = 'created_at', sort_dir = 'desc' } = {}) {
    const conditions = ['1=1'];
    const values = [];

    if (category_id) { conditions.push('p.category_id = ?'); values.push(category_id); }
    if (vendor_id) { conditions.push('p.vendor_id = ?'); values.push(vendor_id); }
    if (is_green_certified !== undefined) { conditions.push('p.is_green_certified = ?'); values.push(is_green_certified ? 1 : 0); }
    if (status) { conditions.push('p.status = ?'); values.push(status); }
    if (search) { conditions.push('(p.name LIKE ? OR p.description LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const allowedSort = ['name', 'base_price', 'created_at', 'updated_at', 'carbon_footprint_kg'];
    const sortCol = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortD = sort_dir === 'asc' ? 'ASC' : 'DESC';

    const total = db.prepare(`SELECT COUNT(*) as count FROM products p WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT p.*, v.company_name AS vendor_name, c.name AS category_name
      FROM products p
      JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE ${where}
      ORDER BY p.${sortCol} ${sortD}
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, fields) {
    const allowed = ['category_id', 'name', 'slug', 'description', 'unit', 'base_price', 'currency', 'carbon_footprint_kg', 'is_green_certified', 'stock_qty', 'status'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'is_green_certified') {
          updates.push(`${key} = ?`);
          values.push(fields[key] ? 1 : 0);
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

    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
  }
};
