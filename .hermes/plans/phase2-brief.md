# Phase 2 Task Brief: Vendor & Product Management

## Context
Phase 2 builds on Phase 1 (auth system). Vendors can manage profiles + catalogs. Buyers browse products by category with green filter.

**Working directory:** `D:\cacaa\green-tech-procurement`

## Interfaces from Phase 1 (consumed by this task)

These already exist — DO NOT recreate:
- `config/db.js` — exports `db` (better-sqlite3 instance, synchronous)
- `helpers/uuid.js` — exports `generateUUID()`
- `helpers/apiResponse.js` — exports `{ success, created, error, notFound, unauthorized, forbidden, validationError }`
- `helpers/pagination.js` — exports `{ getPagination, paginatedResponse }`
- `middleware/auth.js` — JWT guard, sets `req.user = { id, email, role }`
- `middleware/roleCheck.js` — exports `{ allow }`, e.g. `allow('buyer','vendor')`
- `middleware/validate.js` — exports `{ validate }`, runs express-validator results
- `models/DashboardModel.js` — stub, can extend later
- `routes/index.js` — mounts sub-routers under `/api/v1`
- `views/layouts/main.ejs` — shell with nav bar (which shows user info if logged in)
- Database tables: `users`, `vendors`, `product_categories`, `products` already created by migration

## What to build

### 1. models/VendorModel.js

CRUD for vendors table. Methods:

```js
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
```

### 2. models/ProductCategoryModel.js

CRUD with self-referencing parent_id (hierarchical). Methods:

```js
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
    // Returns flat list with parent info — client can build tree
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
    // Set parent_id to null for children first
    db.prepare('UPDATE product_categories SET parent_id = NULL WHERE parent_id = ?').run(id);
    db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
  }
};
```

### 3. models/ProductModel.js

CRUD with vendor+category scope. Methods:

```js
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
```

### 4. controllers/VendorController.js

```js
const VendorModel = require('../models/VendorModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');

module.exports = {
  // GET /api/v1/vendors/profile — vendor's own profile
  getMyProfile(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) {
        return apiResponse.notFound(res, 'Vendor profile not found. Create one first.');
      }
      return apiResponse.success(res, vendor);
    } catch (err) { next(err); }
  },

  // POST /api/v1/vendors/profile — create vendor profile
  createProfile(req, res, next) {
    try {
      const existing = VendorModel.findByUserId(req.user.id);
      if (existing) {
        return apiResponse.validationError(res, [{ msg: 'Vendor profile already exists' }]);
      }
      
      const { company_name, description, website, address, country, tax_id, green_certifications } = req.body;
      const vendor = VendorModel.create({
        user_id: req.user.id,
        company_name, description, website, address, country, tax_id, green_certifications
      });
      return apiResponse.created(res, vendor, 'Vendor profile created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/vendors/profile — update own profile
  updateProfile(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) {
        return apiResponse.notFound(res, 'Vendor profile not found');
      }
      const updated = VendorModel.update(vendor.id, req.body);
      return apiResponse.success(res, updated, 'Vendor profile updated');
    } catch (err) { next(err); }
  },

  // GET /api/v1/vendors — public list with filters
  listVendors(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const { is_approved, country } = req.query;
      const result = VendorModel.findAll({ page, limit, is_approved, country });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // GET /api/v1/vendors/:id — public vendor detail
  getVendor(req, res, next) {
    try {
      const vendor = VendorModel.findById(req.params.id);
      if (!vendor) return apiResponse.notFound(res, 'Vendor not found');
      return apiResponse.success(res, vendor);
    } catch (err) { next(err); }
  }
};
```

### 5. controllers/ProductController.js

```js
const ProductModel = require('../models/ProductModel');
const VendorModel = require('../models/VendorModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');

module.exports = {
  // GET /api/v1/products — public browse with filters
  listProducts(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const { category_id, vendor_id, is_green_certified, search, sort_by, sort_dir } = req.query;
      
      const greenFilter = is_green_certified !== undefined ? is_green_certified === 'true' : undefined;
      
      const result = ProductModel.findAll({
        page, limit,
        category_id: category_id || undefined,
        vendor_id: vendor_id || undefined,
        is_green_certified: greenFilter,
        status: 'active',
        search: search || undefined,
        sort_by: sort_by || undefined,
        sort_dir: sort_dir || undefined
      });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // GET /api/v1/products/:id
  getProduct(req, res, next) {
    try {
      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      return apiResponse.success(res, product);
    } catch (err) { next(err); }
  },

  // GET /api/v1/vendors/me/products — vendor's own products
  getMyProducts(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');
      
      const { page, limit } = getPagination(req.query);
      const result = ProductModel.findByVendor(vendor.id, { page, limit, status: req.query.status });
      return apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  // POST /api/v1/vendors/me/products — vendor creates product
  createProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');
      
      const { name, slug, description, unit, base_price, currency, category_id, carbon_footprint_kg, is_green_certified, stock_qty } = req.body;
      
      const product = ProductModel.create({
        vendor_id: vendor.id,
        category_id, name, slug, description, unit, base_price, currency, carbon_footprint_kg,
        is_green_certified: is_green_certified || false,
        stock_qty: stock_qty || 0,
        status: 'active'
      });
      return apiResponse.created(res, product, 'Product created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/vendors/me/products/:id — vendor updates own product
  updateProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');
      
      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      if (product.vendor_id !== vendor.id) return apiResponse.forbidden(res);
      
      const updated = ProductModel.update(product.id, req.body);
      return apiResponse.success(res, updated, 'Product updated');
    } catch (err) { next(err); }
  },

  // DELETE /api/v1/vendors/me/products/:id
  deleteProduct(req, res, next) {
    try {
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.notFound(res, 'Create vendor profile first');
      
      const product = ProductModel.findById(req.params.id);
      if (!product) return apiResponse.notFound(res, 'Product not found');
      if (product.vendor_id !== vendor.id) return apiResponse.forbidden(res);
      
      ProductModel.delete(product.id);
      return apiResponse.success(res, null, 'Product deleted');
    } catch (err) { next(err); }
  }
};
```

### 6. controllers/ProductCategoryController.js

```js
const ProductCategoryModel = require('../models/ProductCategoryModel');
const apiResponse = require('../helpers/apiResponse');

module.exports = {
  // GET /api/v1/categories
  listCategories(req, res, next) {
    try {
      const categories = ProductCategoryModel.getTree();
      return apiResponse.success(res, categories);
    } catch (err) { next(err); }
  },

  // GET /api/v1/categories/:id
  getCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      return apiResponse.success(res, category);
    } catch (err) { next(err); }
  },

  // POST /api/v1/categories (admin only)
  createCategory(req, res, next) {
    try {
      const { name, slug, description, parent_id } = req.body;
      const existing = ProductCategoryModel.findBySlug(slug);
      if (existing) return apiResponse.validationError(res, [{ msg: 'Slug already exists', param: 'slug' }]);
      
      const category = ProductCategoryModel.create({ name, slug, description, parent_id });
      return apiResponse.created(res, category, 'Category created');
    } catch (err) { next(err); }
  },

  // PUT /api/v1/categories/:id (admin only)
  updateCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      const updated = ProductCategoryModel.update(category.id, req.body);
      return apiResponse.success(res, updated, 'Category updated');
    } catch (err) { next(err); }
  },

  // DELETE /api/v1/categories/:id (admin only)
  deleteCategory(req, res, next) {
    try {
      const category = ProductCategoryModel.findById(req.params.id);
      if (!category) return apiResponse.notFound(res, 'Category not found');
      ProductCategoryModel.delete(category.id);
      return apiResponse.success(res, null, 'Category deleted');
    } catch (err) { next(err); }
  }
};
```

### 7. routes/vendorRoutes.js

```js
const router = require('express').Router();
const { body } = require('express-validator');
const VendorController = require('../controllers/VendorController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Protected — vendor only
router.get('/profile', auth, allow('vendor'), VendorController.getMyProfile);
router.post('/profile', auth, allow('vendor'), [
  body('company_name').trim().isLength({ min: 2 }),
  validate
], VendorController.createProfile);
router.put('/profile', auth, allow('vendor'), VendorController.updateProfile);

// Public
router.get('/', VendorController.listVendors);
router.get('/:id', VendorController.getVendor);

module.exports = router;
```

### 8. routes/productRoutes.js

```js
const router = require('express').Router();
const { body } = require('express-validator');
const ProductController = require('../controllers/ProductController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Vendor's own product management
router.get('/me', auth, allow('vendor'), ProductController.getMyProducts);
router.post('/me', auth, allow('vendor'), [
  body('name').trim().isLength({ min: 2 }),
  body('slug').trim().isLength({ min: 2 }),
  body('unit').trim().notEmpty(),
  body('base_price').isFloat({ min: 0 }),
  validate
], ProductController.createProduct);
router.put('/me/:id', auth, allow('vendor'), ProductController.updateProduct);
router.delete('/me/:id', auth, allow('vendor'), ProductController.deleteProduct);

// Public browse
router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProduct);

module.exports = router;
```

### 9. routes/categoryRoutes.js

```js
const router = require('express').Router();
const { body } = require('express-validator');
const ProductCategoryController = require('../controllers/ProductCategoryController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Public
router.get('/', ProductCategoryController.listCategories);
router.get('/:id', ProductCategoryController.getCategory);

// Admin only
router.post('/', auth, allow('admin'), [
  body('name').trim().isLength({ min: 2 }),
  body('slug').trim().isLength({ min: 2 }),
  validate
], ProductCategoryController.createCategory);
router.put('/:id', auth, allow('admin'), ProductCategoryController.updateCategory);
router.delete('/:id', auth, allow('admin'), ProductCategoryController.deleteCategory);

module.exports = router;
```

### 10. Update routes/index.js

Add these to the existing router:

```js
router.use('/vendors', require('./vendorRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
```

### 11. Views

**views/vendor/profile.ejs:**
- `<% body = 'vendor-profile' %>`
- Form to create/edit vendor profile
- Fields: company_name, description, website, address, country, tax_id
- Green certifications (comma-separated input or tag-style)
- Shows current profile data if exists
- Submit POST/PUT based on whether profile exists

**views/vendor/catalog.ejs:**
- `<% body = 'vendor-catalog' %>`
- Table of vendor's products with: name, category, price, stock, green badge, status
- "Add Product" button
- Each row has Edit/Delete actions

**views/product/list.ejs:**
- `<% body = 'product-list' %>`
- Public product browsing page
- Filters sidebar: category dropdown, green certified toggle, search box
- Product cards grid showing: image placeholder, name, vendor, price, green badge
- Pagination

**views/product/form.ejs:**
- `<% body = 'product-form' %>`
- Create/Edit product form
- Fields: name, slug (auto-generated from name), category (dropdown), description, unit, base_price, currency, carbon_footprint_kg, is_green_certified (checkbox), stock_qty, status (active/inactive)

### 12. Validation schemas

Add to existing validation in routes. Vendor-specific:
- `company_name`: min 2 chars required
- `tax_id`: optional, if provided min 5 chars

Product-specific:
- `name`: min 2 chars required
- `slug`: min 2 chars, alphanumeric + hyphens
- `unit`: not empty
- `base_price`: float >= 0
- `carbon_footprint_kg`: optional float >= 0
- `slug` uniqueness checked in controller (check ProductModel.findBySlug)

### 13. Tests

**tests/models/VendorModel.test.js:**
- create vendor → returns vendor with fields
- findById → returns correct vendor
- findByUserId → returns vendor for user
- update → changes fields, returns updated vendor
- findAll → returns paginated list
- findAll with is_approved filter → filtered results

**tests/models/ProductModel.test.js:**
- create product → returns with correct fields
- findById → joins vendor + category
- findByVendor → scoped to vendor
- findAll with green filter → only green products
- findAll with search → matching products
- update → changes fields
- delete → removes product

**tests/controllers/VendorController.test.js:**
- POST /api/v1/vendors/profile (auth vendor) → 201
- GET /api/v1/vendors/profile (auth vendor) → 200
- PUT /api/v1/vendors/profile (auth vendor) → 200
- POST /api/v1/vendors (no auth) → 401
- GET /api/v1/vendors (public) → 200

**tests/controllers/ProductController.test.js:**
- POST /api/v1/products/me (auth vendor) → 201
- GET /api/v1/products (public) → 200
- GET /api/v1/products?is_green_certified=true → filtered
- PUT /api/v1/products/me/:id (wrong vendor) → 403
- DELETE /api/v1/products/me/:id (auth vendor) → 200

## IMPORTANT Implementation Notes

1. These models use **synchronous better-sqlite3 API** — no async/await needed. Use `.run()`, `.get()`, `.all()`.
2. All controllers wrap logic in try/catch with `next(err)`.
3. Green certification boolean is stored as INTEGER (0/1) in SQLite, converted at model layer.
4. `green_certifications` in vendors is a JSON stringified TEXT array.
5. Vendor product routes are under `/api/v1/products/me/*` (vendor's own products), public browse is `/api/v1/products`.
6. Category routes are under `/api/v1/categories`.
7. Views inherit from `views/layouts/main.ejs`. Pass `{ user, ... }` to all views.
8. Page routes for these views need to be added in server.js (GET /vendors/profile, /vendors/catalog, /products, /products/create, /products/:id/edit).

### Page routes to add in server.js:

```js
const auth = require('./middleware/auth');

// Vendor pages
server.get('/vendors/profile', auth, (req, res) => {
  const VendorModel = require('./models/VendorModel');
  const vendor = VendorModel.findByUserId(req.user.id);
  res.render('vendor/profile', { user: req.user, vendor, page: 'vendor-profile' });
});

server.get('/vendors/catalog', auth, (req, res) => {
  const VendorModel = require('./models/VendorModel');
  const vendor = VendorModel.findByUserId(req.user.id);
  if (!vendor) return res.redirect('/vendors/profile');
  res.render('vendor/catalog', { user: req.user, vendor, page: 'vendor-catalog' });
});

// Product pages
server.get('/products', (req, res) => {
  res.render('product/list', { user: req.user || null, page: 'product-list' });
});

server.get('/products/create', auth, (req, res) => {
  const ProductCategoryModel = require('./models/ProductCategoryModel');
  const categories = ProductCategoryModel.findAll();
  res.render('product/form', { user: req.user, product: null, categories, page: 'product-form' });
});

server.get('/products/:id/edit', auth, (req, res) => {
  // verify ownership if vendor
  res.render('product/form', { user: req.user, product: {}, categories: [], page: 'product-form' });
});
```

## Deliverable
- All models, controllers, routes, views for vendor & product management
- Product category CRUD (admin only for create/update/delete)
- Product browsing with filters (category, green certified, search, sort)
- Vendor profile management
- All tests passing
- Page routes rendering EJS views

## Report Format
Write to `D:\cacaa\green-tech-procurement\.hermes\phase2-report.md`:
- Status: DONE / DONE_WITH_CONCERNS / BLOCKED
- Commits made
- Test results
- Any concerns
