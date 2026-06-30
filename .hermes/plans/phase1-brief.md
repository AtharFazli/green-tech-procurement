# Phase 1 Task Brief: Project Init + DB + Auth

## Context
Build Green Tech Procurement Dashboard — Express.js + SQLite (better-sqlite3) + EJS + JWT auth. This phase creates the entire project skeleton, database, and authentication system.

**Working directory:** `D:\cacaa\green-tech-procurement`

## What to build

### 1. package.json
- name: `green-tech-procurement`
- dependencies: `express`, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`, `ejs`, `express-validator`, `dotenv`, `cors`, `morgan`
- devDependencies: `jest`, `supertest`, `nodemon`
- scripts: `start: node server.js`, `dev: nodemon server.js`, `test: jest --forceExit --detectOpenHandles`
- type: commonjs

### 2. .env file
```
PORT=3000
JWT_SECRET=gtp-dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. config/db.js
- Use better-sqlite3
- Database file path: `./data/green_tech_procurement.db`
- Create `data/` directory if doesn't exist
- Enable WAL mode
- Export `db` instance

### 4. config/auth.js
```js
module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
```

### 5. config/app.js
```js
module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development'
};
```

### 6. Database migration — `migrations/001_initial_schema.js`
Create all tables using better-sqlite3 `db.exec()` SQL.
Export a function `run()` that executes the migration.

Adapted from the plan schema for SQLite:
- UUIDs → use TEXT with `lower(hex(randomblob(16)))` or let JS generate UUIDs
- `gen_random_uuid()` → JS generates UUID via `crypto.randomUUID()`
- `TIMESTAMPTZ` → `TEXT` (ISO 8601)
- `DECIMAL` → `REAL`
- `JSONB` → `TEXT` (JSON.stringify)
- `CHECK` constraints → SQLite supports these
- `INTEGER` auto-increment for `id` columns? No, use TEXT UUIDs
- Drop `ARRAY` for green_certifications — use TEXT (JSON array)

Tables to create (full schema):
1. **users** — id TEXT PK, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('buyer','vendor','admin')), avatar_url TEXT, is_active INTEGER DEFAULT 1, last_login_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
2. **vendors** — id TEXT PK, user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, company_name TEXT NOT NULL, description TEXT, website TEXT, address TEXT, country TEXT, tax_id TEXT, green_certifications TEXT, sustainability_score REAL DEFAULT 0, is_approved INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
3. **product_categories** — id TEXT PK, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, parent_id TEXT REFERENCES product_categories(id), created_at TEXT
4. **products** — id TEXT PK, vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, category_id TEXT REFERENCES product_categories(id), name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, unit TEXT NOT NULL, base_price REAL NOT NULL, currency TEXT DEFAULT 'USD', carbon_footprint_kg REAL, is_green_certified INTEGER DEFAULT 0, stock_qty INTEGER DEFAULT 0, status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','discontinued')), created_at TEXT, updated_at TEXT
5. **rfps** — id TEXT PK, buyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'draft' CHECK(status IN ('draft','open','under_review','awarded','cancelled')), deadline TEXT NOT NULL, budget_min REAL, budget_max REAL, currency TEXT DEFAULT 'USD', sustainability_requirements TEXT, is_green_rfp INTEGER DEFAULT 0, awarded_bid_id TEXT, created_at TEXT, updated_at TEXT
6. **rfp_line_items** — id TEXT PK, rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE, product_id TEXT REFERENCES products(id), item_name TEXT NOT NULL, description TEXT, quantity REAL NOT NULL, unit TEXT NOT NULL, estimated_price REAL, green_requirement TEXT, sort_order INTEGER DEFAULT 0, created_at TEXT
7. **bids** — id TEXT PK, rfp_id TEXT NOT NULL REFERENCES rfps(id) ON DELETE CASCADE, vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','accepted','rejected','withdrawn')), total_amount REAL NOT NULL, currency TEXT DEFAULT 'USD', delivery_timeline_days INTEGER, sustainability_notes TEXT, carbon_offset_included INTEGER DEFAULT 0, notes TEXT, is_winner INTEGER DEFAULT 0, submitted_at TEXT, updated_at TEXT
8. **bid_line_items** — id TEXT PK, bid_id TEXT NOT NULL REFERENCES bids(id) ON DELETE CASCADE, rfp_line_item_id TEXT NOT NULL REFERENCES rfp_line_items(id) ON DELETE CASCADE, unit_price REAL NOT NULL, quantity REAL NOT NULL, total_price REAL NOT NULL, green_score REAL, notes TEXT
9. **activity_logs** — id TEXT PK, user_id TEXT REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, metadata TEXT, created_at TEXT DEFAULT (datetime('now'))

Indexes: all the same as the plan — idx_products_vendor, idx_products_category, idx_products_green, idx_rfps_buyer, idx_rfps_status, idx_rfps_deadline, idx_rfp_line_items_rfp, idx_bids_rfp, idx_bids_vendor, idx_bids_rfp_vendor_unique, idx_bid_line_items_bid, idx_activity_user, idx_activity_entity, idx_activity_created.

Also add a helper function `generateUUID()` that uses `crypto.randomUUID()`.

### 7. helpers/uuid.js
```js
const crypto = require('crypto');
function generateUUID() {
  return crypto.randomUUID();
}
module.exports = { generateUUID };
```

### 8. helpers/apiResponse.js
Standard API response helpers:
```js
function success(res, data, message = 'Success', statusCode = 200) { ... }
function created(res, data, message = 'Created') { ... }
function error(res, message = 'Internal Server Error', statusCode = 500, errors = null) { ... }
function notFound(res, message = 'Not Found') { ... }
function unauthorized(res, message = 'Unauthorized') { ... }
function forbidden(res, message = 'Forbidden') { ... }
function validationError(res, errors, message = 'Validation Failed') { ... }
```

### 9. helpers/pagination.js
```js
function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page, limit, total,
      totalPages: Math.ceil(total / limit)
    }
  };
}
module.exports = { getPagination, paginatedResponse };
```

### 10. helpers/formatters.js
```js
function formatCurrency(amount, currency = 'USD') { ... }
function formatDate(date) { ... }
function formatGreenScore(score) { ... } // e.g. "85.5/100"
module.exports = { formatCurrency, formatDate, formatGreenScore };
```

### 11. middleware/auth.js
JWT verification middleware:
```js
const jwt = require('jsonwebtoken');
const { secret } = require('../config/auth');
// Extracts token from Authorization: Bearer <token> or cookie 'token'
// Sets req.user = { id, email, role }
// On failure: calls apiResponse.unauthorized()
module.exports = (req, res, next) => { ... };
```

### 12. middleware/roleCheck.js
```js
function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return apiResponse.forbidden(res);
    }
    next();
  };
}
module.exports = { allow };
```

### 13. middleware/validate.js
Schema validation runner (uses express-validator):
```js
const { validationResult } = require('express-validator');
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.validationError(res, errors.array());
  }
  next();
}
module.exports = { validate };
```

### 14. middleware/errorHandler.js
Central error handler:
```js
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  apiResponse.error(res, err.message, statusCode);
}
module.exports = errorHandler;
```

### 15. models/UserModel.js
```js
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

  findById(id) { ... },
  findByEmail(email) { ... },
  update(id, fields) { ... },
  findAll({ page = 1, limit = 20, role } = {}) { ... }
};

module.exports = UserModel;
```

### 16. models/DashboardModel.js
Create stub with method placeholders (to be implemented in Phase 4):
```js
const db = require('../config/db');
module.exports = {
  spendByCategory(buyerId, period) { return []; },
  rfpSuccessRate(buyerId) { return { total: 0, awarded: 0, rate: 0 }; },
  vendorPerformance(buyerId) { return []; },
  avgGreenScore(buyerId) { return 0; },
  bidWinRate(vendorId) { return { total: 0, won: 0, rate: 0 }; }
};
```

### 17. controllers/AuthController.js
```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { secret, expiresIn } = require('../config/auth');
const apiResponse = require('../helpers/apiResponse');

const AuthController = {
  // POST /api/v1/auth/register
  // Body: { email, password, name, role }
  async register(req, res, next) {
    try {
      const { email, password, name, role } = req.body;
      
      // Check existing
      const existing = UserModel.findByEmail(email);
      if (existing) {
        return apiResponse.validationError(res, [{ msg: 'Email already registered', param: 'email' }]);
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      
      // Create user
      const user = UserModel.create({ email, password_hash, name, role });
      
      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );
      
      return apiResponse.created(res, {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }, 'Registration successful');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const user = UserModel.findByEmail(email);
      if (!user) {
        return apiResponse.unauthorized(res, 'Invalid email or password');
      }
      
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return apiResponse.unauthorized(res, 'Invalid email or password');
      }
      
      // Update last_login
      UserModel.update(user.id, { last_login_at: new Date().toISOString() });
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );
      
      return apiResponse.success(res, {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/me
  async me(req, res, next) {
    try {
      const user = UserModel.findById(req.user.id);
      if (!user) return apiResponse.notFound(res, 'User not found');
      return apiResponse.success(res, {
        id: user.id, email: user.email, name: user.name, role: user.role
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
```

### 18. controllers/UserController.js
```js
// GET /api/v1/users/:id
// GET /api/v1/users (admin only)
// PUT /api/v1/users/:id
const UserModel = require('../models/UserModel');
const apiResponse = require('../helpers/apiResponse');

module.exports = {
  getProfile(req, res, next) { ... },
  updateProfile(req, res, next) { ... },
  listUsers(req, res, next) { ... }  // admin only
};
```

### 19. routes/authRoutes.js
```js
const router = require('express').Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['buyer', 'vendor']),
  validate
], AuthController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], AuthController.login);

router.get('/me', auth, AuthController.me);

module.exports = router;
```

### 20. routes/userRoutes.js
```js
const router = require('express').Router();
const UserController = require('../controllers/UserController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

router.get('/:id', auth, UserController.getProfile);
router.put('/:id', auth, UserController.updateProfile);
router.get('/', auth, allow('admin'), UserController.listUsers);

module.exports = router;
```

### 21. routes/index.js
Mount all sub-routers:
```js
const router = require('express').Router();
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
// Future: router.use('/vendors', require('./vendorRoutes'));
// Future: router.use('/products', require('./productRoutes'));
// Future: router.use('/rfps', require('./rfpRoutes'));
// Future: router.use('/bids', require('./bidRoutes'));
// Future: router.use('/dashboard', require('./dashboardRoutes'));
module.exports = router;
```

Mount this in server.js at `/api/v1`.

### 22. views/layouts/main.ejs
Full HTML shell with:
- DOCTYPE html, lang="en"
- Meta viewport
- Title block
- Tailwind CSS CDN (script tag from unpkg or tailwind CDN)
- Link to /css/app.css
- A navbar with: logo "GreenTech Procurement", nav links (Dashboard, RFPs, Products, Bids), user dropdown (email, role, logout)
- If user is logged in: show nav. If not: show Login/Register links
- `<%- body %>` content area
- Script block at bottom for page-specific JS
- Color scheme: green (#059669 emerald-600) + white

### 23. views/auth/login.ejs
```html
<% body = 'login' %>
<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
    <h2 class="text-2xl font-bold text-emerald-700 mb-6">Sign In</h2>
    <form action="/api/v1/auth/login" method="POST" class="space-y-4">
      <div><label class="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" required class="w-full rounded border-gray-300 shadow-sm"></div>
      <div><label class="block text-sm font-medium text-gray-700">Password</label><input type="password" name="password" required class="w-full rounded border-gray-300 shadow-sm"></div>
      <button type="submit" class="w-full bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700">Sign In</button>
    </form>
    <p class="mt-4 text-center text-sm">Don't have an account? <a href="/register" class="text-emerald-600">Register</a></p>
  </div>
</div>
```

### 24. views/auth/register.ejs
Same layout but registration form with fields: name, email, password, role (select: buyer/vendor).

### 25. views/dashboard/buyer.ejs (stub)
```html
<% body = 'dashboard-buyer' %>
<div class="p-6">
  <h1 class="text-2xl font-bold text-gray-800">Buyer Dashboard</h1>
  <p class="text-gray-600 mt-2">Welcome, <%= user.name %>. Green procurement at a glance.</p>
  <!-- Phase 4 will add charts -->
</div>
```

### 26. views/dashboard/vendor.ejs (stub)
```html
<% body = 'dashboard-vendor' %>
<div class="p-6">
  <h1 class="text-2xl font-bold text-gray-800">Vendor Dashboard</h1>
  <p class="text-gray-600 mt-2">Welcome, <%= user.name %>. Manage your bids and catalog.</p>
  <!-- Phase 4 will add charts -->
</div>
```

### 27. public/css/app.css
Basic custom styles beyond Tailwind:
```css
/* Green Tech Procurement Dashboard — custom styles */
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
/* Add any overrides or custom utilities here */
```

### 28. server.js
Main entry point:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = require('./config/app');
const errorHandler = require('./middleware/errorHandler');

// Run migrations
require('./migrations/001_initial_schema').run();

const server = express();

// Middleware
server.use(cors());
server.use(morgan('dev'));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static(path.join(__dirname, 'public')));

// View engine
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));

// Make user available to templates
const auth = require('./middleware/auth');
// For web pages, use cookie-based auth
server.get(['/', '/login', '/register', '/dashboard/*', '/rfps*', '/bids*', '/products*', '/vendors*'], (req, res, next) => {
  // Try to parse JWT from cookie
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  // Simplified: just render pages, auth handled client-side or via cookie
  next();
});

server.get('/login', (req, res) => res.render('auth/login', { user: null }));
server.get('/register', (req, res) => res.render('auth/register', { user: null }));

// API routes
server.use('/api/v1', require('./routes'));

// Error handler
server.use(errorHandler);

server.listen(app.port, () => {
  console.log(`GreenTech Procurement Server running on port ${app.port}`);
});

module.exports = server;
```

Actually, for cookie parsing we need `cookie-parser` package. Add `cookie-parser` to dependencies in package.json. And use it:
```js
const cookieParser = require('cookie-parser');
server.use(cookieParser());
```

Also, the page routes need to be after cookie-parser.

### 29. tests/setup.js
Test setup with supertest:
```js
const request = require('supertest');
// Before all tests: run migrations fresh
// After all tests: close db connections
```

### 30. tests/models/UserModel.test.js
Tests for UserModel:
- create user with all roles
- findById
- findByEmail
- update user fields
- findAll with pagination

### 31. tests/controllers/AuthController.test.js
Tests:
- POST /api/v1/auth/register → success (201)
- POST /api/v1/auth/register → duplicate email (422)
- POST /api/v1/auth/register → validation error (422)
- POST /api/v1/auth/login → success (200)
- POST /api/v1/auth/login → wrong password (401)
- GET /api/v1/auth/me → with valid token (200)
- GET /api/v1/auth/me → without token (401)

### 32. tests/middleware/auth.test.js
Tests:
- Missing token → 401
- Invalid token → 401
- Valid token → calls next with req.user set

## Implementation Requirements

1. **Run migration on startup** — `server.js` should call `require('./migrations/001_initial_schema').run()` before starting
2. **Database path:** `./data/green_tech_procurement.db`
3. **Error handling:** All async controller methods must have try/catch with `next(err)`
4. **JWT token:** Returned in response body AND set as httpOnly cookie named `token`
5. **Password min length:** 6 characters
6. **Email normalization:** lowercase before storing
7. **CORS:** Allow all origins in development
8. **Tests use a separate test database** — `./data/test.db` with migrations run fresh before each test file

## Deliverable
A working Express server with:
- All 9 database tables created
- User registration (buyer/vendor)
- User login with JWT
- Session check endpoint (/me)
- Login/register pages
- Dashboard stubs for buyer and vendor
- All tests passing

## Report Contract
After completing, write report to `D:\cacaa\green-tech-procurement\.hermes\phase1-report.md` containing:
- Status: DONE / DONE_WITH_CONCERNS / BLOCKED
- Commits made (list them with hashes)
- Test results (command run + output)
- Any concerns or notes
